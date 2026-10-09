import { getStatueBonus } from '@parsers/world-1/statues';
import { getJellyReward } from '@parsers/world-7/jellyRewards';
import type { IdleonData, Account } from '../types';
import { getEquinoxBonus } from '@parsers/world-3/equinox';
import { ninjaExtraInfo } from '@website-data';
import { getCosmoBonus } from '@parsers/world-5/hole';
import { getWinnerBonus } from '@parsers/world-6/summoning';
import { getEventShopBonus, isCompanionBonusActive } from '@parsers/misc';
import { getLegendTalentBonus } from '@parsers/world-7/legendTalents';
import { getArcadeBonus } from '@parsers/world-2/arcade';
import { getClamWorkBonus } from '@parsers/world-7/clamWork';
import { getPaletteBonus } from '@parsers/world-5/gaming';
import { getSushiBonus } from '@parsers/world-7/sushiStation';

export const getVoteBallot = (idleonData: IdleonData, accountData: Account) => {
  return parseVoteBallot(idleonData, accountData);
}

const parseVoteBallot = (idleonData: IdleonData, accountData: Account) => {
  const { votePercent, voteCategories, voteCat2, votePercent2 } = (accountData as any)?.serverVars || {};
  const [selectedCategory, ...currentCategories] = voteCategories || [];
  const [selectedCategory2, ...currentCategories2] = voteCat2 || [];

  // "MeritocBonusz" == e
  const companionBonus = isCompanionBonusActive(accountData, 39) ? (accountData as any)?.companions?.list?.at(39)?.bonus : 0;
  const poppyBonus = isCompanionBonusActive(accountData, 161) ? (accountData as any)?.companions?.list?.at(161)?.bonus ?? 0 : 0;
  const arcadeBonus = getArcadeBonus((accountData as any)?.arcade?.shop, 'Meritocracy_Bonus')?.bonus ?? 0;
  const legendTalentBonus = getLegendTalentBonus(accountData, 24) ?? 0;
  const clamWorkBonus = getClamWorkBonus(accountData, 3) ?? 0;
  const meritocracySushiBonus = getSushiBonus(accountData, 51) ?? 0;
  const meritocracyEventShopBonus = getEventShopBonus(accountData, 23) ?? 0;
  const meritocracyBase = Number((accountData as any)?.accountOptions?.[472]) === 1 ? 1 : 0.25;
  const meritocracyAccess = (accountData as any)?.meritocracyAccessible !== false;
  const jellyBonus = getJellyReward(accountData, 33);
  const meritocracyMult = meritocracyAccess ? (1 + poppyBonus / 100) * (meritocracyBase + (5 * clamWorkBonus
    + (companionBonus
      + (legendTalentBonus
        + (arcadeBonus
          + (20 * meritocracyEventShopBonus + meritocracySushiBonus + jellyBonus))))) / 100) : 0;
  const meritocracyMultBreakdown = {
    statName: 'Meritocracy multi',
    totalValue: meritocracyMult,
    categories: [
      {
        name: 'Multiplicative',
        sources: [
          { name: 'Poppy Companion', value: 1 + poppyBonus / 100 }
        ]
      },
      {
        name: 'Additive (% bonus)',
        sources: [
          { name: 'Clam Work ', value: 5 * clamWorkBonus },
          { name: 'Companion (Pufferblob)', value: companionBonus },
          { name: 'Legend Talent', value: legendTalentBonus },
          { name: 'Arcade', value: arcadeBonus },
          { name: 'Event Shop', value: 20 * meritocracyEventShopBonus },
          { name: 'Sushi Tier 51', value: meritocracySushiBonus },
          { name: 'Jelly Operator', value: jellyBonus }
        ]
      }
    ]
  };

  const parts = ninjaExtraInfo[41];
  const upgrades: { description: string; value: number; extra: number }[] = [];
  let meritocracyBonuses: any[];

  for (let i = 0; i < parts.length;) {
    let desc: string[] = [];

    while (isNaN(Number(parts[i]))) {
      desc.push(parts[i]);
      i++;
    }

    const value = Number(parts[i++]);
    const extra = Number(parts[i++]); // always 0

    upgrades.push({ description: desc.join(" "), value, extra });
  }

  // Step 2: Apply your transformation logic
  meritocracyBonuses = upgrades.map((bonus, index) => {
    const bonusIndex = currentCategories2.findIndex((ind: number) => ind === index);

    return {
      ...bonus,
      icon: `MeritBon${index}.png`,
      active: bonusIndex > -1,
      selected: selectedCategory2 === index,
      percent: votePercent2?.[bonusIndex] || 0,
      bonus: bonus.value * meritocracyMult
    };
  });

  const companionBonus2 = isCompanionBonusActive(accountData, 19) ? (accountData as any)?.companions?.list?.at(19)?.bonus ?? 0 : 0;
  const companionBonus3 = isCompanionBonusActive(accountData, 41) ? (accountData as any)?.companions?.list?.at(41)?.bonus ?? 0 : 0;
  const paletteBonus = getPaletteBonus(accountData, 32) ?? 0;
  const legendTalentBonus2 = getLegendTalentBonus(accountData, 22) ?? 0;
  const eventShopBonus2 = getEventShopBonus(accountData, 7) ?? 0;
  const eventShopBonus3 = getEventShopBonus(accountData, 16) ?? 0;
  const cosmoBonus = getCosmoBonus({ majik: (accountData as any)?.hole?.holesObject?.idleonMajiks, t: 2, i: 3 }) ?? 0;
  const winnerBonus = getWinnerBonus(accountData, '+{% Ballot Bonus') ?? 0;
  const equinoxBonus = getEquinoxBonus((accountData as any)?.equinox?.upgrades, 'Voter_Rights') ?? 0;
  const meritocracyBonus = getMeritocracyBonus(accountData, 9) ?? 0;
  const ballotSushiBonus = getSushiBonus(accountData, 50) ?? 0;

  // VotingBonusz == e
  const voteMulti = (1 + poppyBonus / 100)
    * (1 + meritocracyBonus / 100)
    * (1 + (companionBonus3 + equinoxBonus + (cosmoBonus + (winnerBonus +
      (17 * eventShopBonus2 + 13 * eventShopBonus3 + (companionBonus2 + (paletteBonus + (legendTalentBonus2 + ballotSushiBonus))))))) / 100);
  const voteMultiBreakdown = {
    statName: 'Bonus multi',
    totalValue: voteMulti,
    categories: [
      {
        name: 'Multiplicative',
        sources: [
          { name: 'Companion (Poppy)', value: 1 + poppyBonus / 100 },
          { name: 'Meritocracy Bonus', value: 1 + meritocracyBonus / 100 }
        ]
      },
      {
        name: 'Additive (% bonus)',
        sources: [
          { name: 'Companion (Crystal Cuttlefish)', value: companionBonus3 },
          { name: 'Equinox', value: equinoxBonus },
          { name: 'Cosmo', value: cosmoBonus },
          { name: 'Summoning Win', value: winnerBonus },
          { name: 'Event Shop 7', value: 17 * eventShopBonus2 },
          { name: 'Event Shop 16', value: 13 * eventShopBonus3 },
          { name: 'Companion (Mashed Potato)', value: companionBonus2 },
          { name: 'Palette', value: paletteBonus },
          { name: 'Legend Talent', value: legendTalentBonus2 },
          { name: 'Sushi Tier 50', value: ballotSushiBonus }
        ]
      }
    ]
  };

  const bonuses = (ninjaExtraInfo[38] as any).toChunks(3).map((bonus: any, index: number) => {
    const bonusIndex = currentCategories.findIndex((ind: any) => ind === index);
    return {
      ...bonus,
      icon: `VoteBon${index}.png`,
      active: bonusIndex > -1,
      selected: selectedCategory === index,
      percent: votePercent?.[bonusIndex] || 0,
      bonus: parseFloat(bonus?.[1]) * voteMulti
    }
  });

  return {
    bonuses,
    meritocracyBonuses,
    voteMulti,
    voteMultiBreakdown,
    meritocracyMult,
    meritocracyMultBreakdown,
    selectedBonus: { ...bonuses?.[selectedCategory], index: selectedCategory },
    selectedMeritocracyBonus: { ...meritocracyBonuses?.[selectedCategory2], index: selectedCategory2 }
  }
}

export const getVoteBonus = (account: Account, index: number): number => {
  const isSelected = (account as any)?.voteBallot?.bonuses?.[index]?.selected;
  return isSelected ? (account as any)?.voteBallot?.bonuses?.[index]?.bonus : 0;
}

export const getMeritocracyBonus = (account: Account, index: number): number => {
  const isSelected = (account as any)?.voteBallot?.meritocracyBonuses?.[index]?.selected;
  return isSelected ? (account as any)?.voteBallot?.meritocracyBonuses?.[index]?.bonus : 0;
}

// Meritocracy is unavailable until THIS character reaches W7. Account previews
// retain their shared bonuses; stat calculations remove the cached vial/sigil
// factors and recompute ballot scaling for characters who have not reached it.
export const getCharacterStatAccount = (account: any, character: any) => {
  if (character?.galleryUnlocked !== false || account?.meritocracyAccessible === false) return account;
  const vialFactor = 1 + getMeritocracyBonus(account, 20) / 100;
  const sigilFactor = 1 + getMeritocracyBonus(account, 21) / 100;
  const contextual = { ...account, meritocracyAccessible: false,
    voteBallot: { ...account.voteBallot, meritocracyBonuses: account.voteBallot?.meritocracyBonuses?.map((b: any) => ({ ...b, bonus: 0 })) },
    alchemy: { ...account.alchemy,
      vials: account.alchemy?.vials?.map((v: any) => ({ ...v, multiplier: (v.multiplier ?? 1) / vialFactor })),
      p2w: { ...account.alchemy?.p2w, sigils: account.alchemy?.p2w?.sigils?.map((s: any) => {
        const copy = { ...s };
        for (const key of ['bonus', 'unlockBonus', 'boostBonus', 'jadeBonus', 'etherealBonus', 'eclecticBonus'])
          if (typeof copy[key] === 'number') copy[key] /= sigilFactor;
        return copy;
      }) }
    }
  };
  // Remove cached Meritocracy factors, including Dragon statue's downstream multiplier.
  contextual.statues = account.statues?.map((statue: any) => ({ ...statue, meritocracyMulti: 1 }));
  const dragonMulti = 1 + getStatueBonus(contextual, 29) / 100;
  contextual.statues = contextual.statues?.map((statue: any) => ({ ...statue, dragonMulti }));
  const artifactFactor = 1 + getMeritocracyBonus(account, 23) / 100;
  contextual.sailing = { ...account.sailing, artifacts: account.sailing?.artifacts?.map((artifact: any) =>
    ['Ruble_Cuble', '10_AD_Tablet', 'Jade_Rock', 'Gummy_Orb'].includes(artifact.name)
      ? { ...artifact, bonus: artifact.bonus / artifactFactor } : artifact) };
  contextual.voteBallot = getVoteBallot({} as IdleonData, contextual);
  return contextual;
};
