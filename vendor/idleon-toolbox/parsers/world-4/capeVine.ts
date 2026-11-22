import { tryToParse } from '@utility/helpers';
import { items } from '@website-data';
import { isCompanionBonusActive } from '@parsers/misc';
import { getHatRackBonus } from '@parsers/world-3/hatRack';

export const getCapeVine = (idleonData: any, account: any) => {
  const capes = tryToParse(idleonData?.Spelunk)?.[54] ?? [];
  const bundles = tryToParse(idleonData?.BundlesReceived) ?? {};
  const goldenVines = Math.round(1 + Number(account?.accountOptions?.[669] || 0)
    + 3 * (Number(bundles.ban_o) === 1 ? 1 : 0));
  const companion = isCompanionBonusActive(account, 105) ? account?.companions?.list?.[105]?.bonus ?? 0 : 0;
  const multiplier = 1 + (capes.length + companion) / 100;
  const bonuses: Record<string, number> = {};
  capes.forEach((name: string, index: number) => {
    const item = items[name];
    if (!item) return;
    const multi = multiplier * (index < goldenVines ? 1 : .25);
    for (const slot of [1, 2]) {
      const stat = item[`UQ${slot}txt`];
      if (stat && stat !== '0') bonuses[stat] = (bonuses[stat] ?? 0) + multi * Number(item[`UQ${slot}val`] || 0);
    }
    // InitializeCapeBonuses reads PremHatBonTOT for each base-stat assignment,
    // rather than accumulating CapeVineBonTOT. Preserve that client behavior.
    for (const stat of ['Weapon_Power', 'STR', 'AGI', 'WIS', 'LUK', 'Defence']) {
      bonuses[stat] = getHatRackBonus(account, stat) + multi * Number(item[stat] || 0);
    }
  });
  return { bonuses, multiplier, goldenVines };
};

export const getCapeVineBonus = (account: any, stat: string) => account?.capeVine?.bonuses?.[stat] ?? 0;
