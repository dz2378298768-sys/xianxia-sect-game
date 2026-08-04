export type ArtifactType =
  | 'flying_sword'
  | 'defensive_shield'
  | 'attack_talisman'
  | 'spirit_bottle'
  | 'space_ring'
  | 'thunder_pearl'
  | 'bagua_mirror'
  | 'demon_pagoda';

export const ArtifactTypeNames: Record<ArtifactType, string> = {
  flying_sword: '飞剑',
  defensive_shield: '防御盾',
  attack_talisman: '攻击符',
  spirit_bottle: '聚灵瓶',
  space_ring: '储物戒',
  thunder_pearl: '雷珠',
  bagua_mirror: '八卦镜',
  demon_pagoda: '镇妖塔',
};

export interface Artifact {
  type: ArtifactType;
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
  combatPowerBonus?: number;
}

export interface ArtifactInventory {
  type: ArtifactType;
  quantity: number;
}

export interface ArtifactCraftingTask {
  id: string;
  artifactType: ArtifactType;
  quantity: number;
  progress: number;
  totalDays: number;
  autoRefill: boolean;
}
