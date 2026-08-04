export type PillType =
  | 'foundation_pill'
  | 'golden_pill'
  | 'nascent_pill'
  | 'spirit_pill'
  | 'recovery_pill'
  | 'longevity_pill'
  | 'detox_pill'
  | 'qi_gathering_pill'
  | 'body_forging_pill';

export const PillTypeNames: Record<PillType, string> = {
  foundation_pill: '筑基丹',
  golden_pill: '金丹破障丹',
  nascent_pill: '元婴化灵丹',
  spirit_pill: '化神渡劫丹',
  recovery_pill: '回灵丹',
  longevity_pill: '增寿丹',
  detox_pill: '清心丹',
  qi_gathering_pill: '聚气丹',
  body_forging_pill: '锻骨丹',
};

export interface Pill {
  type: PillType;
  name: string;
  description: string;
  effect: string;
  breakthroughBonus: number;
  targetRealm?: string;
  materials: { name: string; amount: number }[];
  spiritStoneCost: number;
  craftTimeDays: number;
  sellPrice: number;
  contributionCost: number;
  unlocked: boolean;
  lifespanBonus?: number;      // 寿命增加（首次服用有效）
  firstUseOnly?: boolean;       // 是否仅首次服用有效
}

export interface PillInventory {
  type: PillType;
  quantity: number;
}

export interface CraftingTask {
  id: string;
  pillType: PillType;
  quantity: number;
  progress: number;
  totalDays: number;
  autoRefill: boolean;
}
