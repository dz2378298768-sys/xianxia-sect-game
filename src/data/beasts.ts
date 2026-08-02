import type { Beast, BeastType } from '@/types/beast';

export const BEAST_CONFIGS: Record<BeastType, Beast> = {
  spirit_fox: {
    type: 'spirit_fox',
    name: '灵狐',
    description: '通灵之狐，敏捷灵动，可助主人闪避与暴击。',
    tier: 2,
    combatPowerBonus: 30,
    sellPrice: 800,
    spiritStoneCost: 800,
  },
  mystic_turtle: {
    type: 'mystic_turtle',
    name: '玄龟',
    description: '玄水之龟，甲壳坚厚，可为主人分担损伤。',
    tier: 2,
    combatPowerBonus: 40,
    sellPrice: 900,
    spiritStoneCost: 900,
  },
  fire_crow: {
    type: 'fire_crow',
    name: '火鸦',
    description: '三足火鸦，烈焰焚敌，攻击凌厉。',
    tier: 3,
    combatPowerBonus: 70,
    sellPrice: 1800,
    spiritStoneCost: 1800,
  },
  jade_rabbit: {
    type: 'jade_rabbit',
    name: '玉兔',
    description: '月宫玉兔，灵药伴生，可延寿增元。',
    tier: 3,
    combatPowerBonus: 25,
    lifespanBonus: 50,
    sellPrice: 2200,
    spiritStoneCost: 2200,
  },
  golden_roc: {
    type: 'golden_roc',
    name: '金鹏',
    description: '上古金鹏后裔，攻防兼备，万兽之王。',
    tier: 4,
    combatPowerBonus: 150,
    sellPrice: 6000,
    spiritStoneCost: 6000,
  },
};

export const BEAST_LIST: Beast[] = Object.values(BEAST_CONFIGS);

// 按品阶分组（供商店按品阶陈列）
export const BEASTS_BY_TIER: Record<number, Beast[]> = BEAST_LIST.reduce(
  (acc, b) => {
    (acc[b.tier] = acc[b.tier] || []).push(b);
    return acc;
  },
  {} as Record<number, Beast[]>,
);
