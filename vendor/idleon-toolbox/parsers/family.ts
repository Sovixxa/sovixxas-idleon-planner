import { growth } from '@utility/helpers';
import { checkCharClass, CLASSES, getTalentBonus } from '@parsers/talents';
import { classFamilyBonuses } from '@website-data';

export const getFamilyBonusBonus = (bonuses: any[], bonusName: string, level: number) => {
  const bonus = bonuses?.find(({ name }) => name?.includes(bonusName));
  if (!bonus || level < bonus?.x3) return 0;
  return growth(bonus?.func, Math.max(0, Math.round(level - bonus?.x3)), bonus?.x1, bonus?.x2, false);
}

export const getFamilyBonus = (bonuses: any[], bonusName: string) => {
  return bonuses?.find(({ name }) => name?.includes(bonusName));
}

export const getUpdatedFamilyBonus = (character: any, charactersLevels: any) => {
  return getCharacterFamilyBonus(character, charactersLevels, 'LV_FOR_ALL_TALENTS_ABOVE_LV_1', CLASSES.Elemental_Sorcerer);
}

// TalentCalc(-3) compares the next raw provider to the already amplified cache.
// Keep roster order and amplify only when the provider is the played character.
export const getCharacterFamilyBonus = (character: any, providers: any[], name: string, className: string) => {
  let result = 0;
  for (const [index, provider] of (providers ?? []).entries()) {
    if (!checkCharClass(provider?.class, className)) continue;
    const raw = getFamilyBonusBonus(classFamilyBonuses, name, provider?.level ?? 0);
    if (raw > result) result = raw * ((provider.playerId ?? index) === character?.playerId
      ? 1 + getTalentBonus(character?.flatTalents, 'THE_FAMILY_GUY') / 100 : 1);
  }
  return result;
};
