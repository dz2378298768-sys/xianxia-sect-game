export type TalismanType =
  | 'fire_talisman'
  | 'ice_talisman'
  | 'thunder_talisman'
  | 'heal_talisman'
  | 'teleport_talisman'
  | 'stealth_talisman'
  | 'ward_talisman'
  | 'sword_talisman'
  | 'divine_talisman';

export const TalismanTypeNames: Record<TalismanType, string> = {
  fire_talisman: '烈火符',
  ice_talisman: '寒冰符',
  thunder_talisman: '惊雷符',
  heal_talisman: '回春符',
  teleport_talisman: '传送符',
  stealth_talisman: '隐身符',
  ward_talisman: '镇宅符',
  sword_talisman: '剑气符',
  divine_talisman: '神行符',
};

export interface Talisman {
  type: TalismanType;
  name: string;
  description: string;
  effect: string;
  tier: 'low' | 'middle' | 'high' | 'top';
  materials: { name: string; amount: number }[];
  spiritStoneCost: number;
  craftTimeDays: number;
  sellPrice: number;
  contributionCost: number;
  unlocked: boolean;
  defenseBonus?: number;
}

export interface TalismanInventory {
  type: TalismanType;
  quantity: number;
}

export interface TalismanCraftingTask {
  id: string;
  talismanType: TalismanType;
  quantity: number;
  progress: number;
  totalDays: number;
  autoRefill: boolean;
}
