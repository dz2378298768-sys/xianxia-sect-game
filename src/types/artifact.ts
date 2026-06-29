export type ArtifactType = 
  | 'flying_sword'
  | 'defensive_shield'
  | 'attack_talisman'
  | 'spirit_bottle'
  | 'space_ring';

export const ArtifactTypeNames: Record<ArtifactType, string> = {
  flying_sword: '飞剑',
  defensive_shield: '防御盾',
  attack_talisman: '攻击符',
  spirit_bottle: '聚灵瓶',
  space_ring: '储物戒',
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
